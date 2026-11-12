CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'pharmacist');
CREATE TYPE public.reimbursement_status AS ENUM ('full', 'partial', 'none');
CREATE TYPE public.prescription_status AS ENUM ('active', 'dispensed', 'cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Doctors and pharmacists can see patient names (to issue / verify prescriptions)
CREATE POLICY "Staff view patient profiles" ON public.profiles FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'pharmacist')) AND public.has_role(id, 'patient'));

-- Signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  BEGIN
    _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'patient')::public.app_role;
  EXCEPTION WHEN others THEN
    _role := 'patient';
  END;
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Medicines
CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  generic_name_xpn text NOT NULL,
  dosage_form text,
  strength text,
  manufacturer text,
  reimbursement_status public.reimbursement_status NOT NULL DEFAULT 'none',
  reimbursement_percent integer NOT NULL DEFAULT 0 CHECK (reimbursement_percent BETWEEN 0 AND 100),
  price numeric(12,2),
  covered_conditions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medicines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view medicines" ON public.medicines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pharmacists manage medicines" ON public.medicines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'pharmacist')) WITH CHECK (public.has_role(auth.uid(), 'pharmacist'));

-- Pharmacies
CREATE TABLE public.pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  latitude double precision,
  longitude double precision,
  phone text,
  is_dtsj_partner boolean NOT NULL DEFAULT false,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pharmacies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pharmacies" ON public.pharmacies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pharmacists add own pharmacy" ON public.pharmacies FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Owners update pharmacy" ON public.pharmacies FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners delete pharmacy" ON public.pharmacies FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Per-pharmacy stock
CREATE TABLE public.pharmacy_stock (
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pharmacy_id, medicine_id)
);
GRANT SELECT ON public.pharmacy_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_stock TO authenticated;
GRANT ALL ON public.pharmacy_stock TO service_role;
ALTER TABLE public.pharmacy_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stock" ON public.pharmacy_stock FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pharmacists manage stock" ON public.pharmacy_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'pharmacist')) WITH CHECK (public.has_role(auth.uid(), 'pharmacist'));

-- Prescriptions
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code char(12) NOT NULL UNIQUE CHECK (code ~ '^[0-9]{12}$'),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id),
  diagnosis text,
  dosage text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes text,
  status public.prescription_status NOT NULL DEFAULT 'active',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  dispensed_at timestamptz,
  dispensed_by uuid,
  pharmacy_id uuid REFERENCES public.pharmacies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prescriptions_patient_idx ON public.prescriptions(patient_id);
CREATE INDEX prescriptions_doctor_idx ON public.prescriptions(doctor_id);
GRANT SELECT, INSERT, UPDATE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_prescription_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE _c text;
BEGIN
  LOOP
    _c := lpad(floor(random() * 1e12)::bigint::text, 12, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.prescriptions WHERE code = _c);
  END LOOP;
  RETURN _c;
END; $$;

CREATE OR REPLACE FUNCTION public.prescriptions_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN NEW.code := public.generate_prescription_code(); END IF;
  NEW.issued_at := COALESCE(NEW.issued_at, now());
  NEW.expires_at := NEW.issued_at + interval '7 days';
  RETURN NEW;
END; $$;
CREATE TRIGGER prescriptions_set_defaults BEFORE INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.prescriptions_before_insert();

CREATE OR REPLACE FUNCTION public.prescriptions_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code := OLD.code; NEW.issued_at := OLD.issued_at; NEW.expires_at := OLD.expires_at;
  NEW.patient_id := OLD.patient_id; NEW.doctor_id := OLD.doctor_id;
  IF NEW.status = 'dispensed' AND OLD.status <> 'dispensed' THEN
    IF OLD.status <> 'active' OR now() > OLD.expires_at THEN
      RAISE EXCEPTION 'Retsept muddati tugagan yoki faol emas';
    END IF;
    NEW.dispensed_at := now();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER prescriptions_guard_update BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.prescriptions_before_update();

CREATE POLICY "Patients view own prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Doctors view issued prescriptions" ON public.prescriptions FOR SELECT TO authenticated
  USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Pharmacists view prescriptions" ON public.prescriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Doctors issue prescriptions" ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor') AND public.has_role(patient_id, 'patient'));
CREATE POLICY "Doctors cancel own prescriptions" ON public.prescriptions FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- 4-digit SMS confirmation code per prescription (kept apart so pharmacists cannot read it)
CREATE TABLE public.prescription_sms (
  prescription_id uuid PRIMARY KEY REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  sms_code char(4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prescription_sms TO authenticated;
GRANT ALL ON public.prescription_sms TO service_role;
ALTER TABLE public.prescription_sms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient or issuing doctor views SMS code" ON public.prescription_sms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND (p.patient_id = auth.uid() OR p.doctor_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.prescriptions_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.prescription_sms (prescription_id, sms_code)
  VALUES (NEW.id, lpad(floor(random() * 10000)::int::text, 4, '0'));
  RETURN NEW;
END; $$;
CREATE TRIGGER prescriptions_create_sms AFTER INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.prescriptions_after_insert();

-- Pharmacist dispenses: verifies SMS code, marks dispensed, deducts 1 unit of stock
CREATE OR REPLACE FUNCTION public.dispense_prescription(_code text, _sms_code text, _pharmacy_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rx public.prescriptions;
  _expected text;
  _left integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'pharmacist') THEN
    RAISE EXCEPTION 'Faqat farmatsevt dori bera oladi';
  END IF;
  SELECT * INTO _rx FROM public.prescriptions WHERE code = _code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retsept topilmadi'; END IF;
  IF _rx.status <> 'active' THEN RAISE EXCEPTION 'Retsept faol emas (allaqachon berilgan yoki bekor qilingan)'; END IF;
  IF now() > _rx.expires_at THEN RAISE EXCEPTION 'Retsept muddati tugagan'; END IF;
  SELECT sms_code INTO _expected FROM public.prescription_sms WHERE prescription_id = _rx.id;
  IF _expected IS NULL OR _expected <> _sms_code THEN RAISE EXCEPTION 'SMS kod noto''g''ri'; END IF;
  UPDATE public.pharmacy_stock SET quantity = quantity - 1, updated_at = now()
    WHERE pharmacy_id = _pharmacy_id AND medicine_id = _rx.medicine_id AND quantity > 0
    RETURNING quantity INTO _left;
  IF _left IS NULL THEN RAISE EXCEPTION 'Bu dorixonada ushbu dori qolmagan'; END IF;
  UPDATE public.prescriptions SET status = 'dispensed', dispensed_by = auth.uid(), pharmacy_id = _pharmacy_id
    WHERE id = _rx.id;
  RETURN json_build_object('prescription_id', _rx.id, 'stock_left', _left);
END; $$;
REVOKE EXECUTE ON FUNCTION public.dispense_prescription(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispense_prescription(text, text, uuid) TO authenticated;

-- Seed: medicines (condition keys: gipertoniya, diabet2, astma, osok, yik)
INSERT INTO public.medicines (brand_name, generic_name_xpn, dosage_form, strength, manufacturer, reimbursement_status, reimbursement_percent, price, covered_conditions) VALUES
('Panadol', 'Paracetamol', 'Tablet', '500 mg', 'GSK', 'full', 100, 12000, '{}'),
('Augmentin', 'Amoxicillin + Clavulanic acid', 'Tablet', '875/125 mg', 'GSK', 'partial', 50, 68000, '{}'),
('Glucophage', 'Metformin', 'Tablet', '850 mg', 'Merck', 'full', 100, 34000, '{diabet2}'),
('Siofor', 'Metformin', 'Tablet', '850 mg', 'Berlin-Chemie', 'full', 100, 29000, '{diabet2}'),
('Diabeton MR', 'Gliclazide', 'Tablet', '60 mg', 'Servier', 'full', 100, 52000, '{diabet2}'),
('Lipitor', 'Atorvastatin', 'Tablet', '20 mg', 'Pfizer', 'partial', 50, 95000, '{yik}'),
('Atoris', 'Atorvastatin', 'Tablet', '20 mg', 'KRKA', 'full', 100, 60000, '{yik}'),
('Nurofen', 'Ibuprofen', 'Tablet', '400 mg', 'Reckitt', 'none', 0, 28000, '{}'),
('Concor', 'Bisoprolol', 'Tablet', '5 mg', 'Merck', 'full', 100, 41000, '{gipertoniya,yik}'),
('Bisoprolol-Richter', 'Bisoprolol', 'Tablet', '5 mg', 'Gedeon Richter', 'full', 100, 26000, '{gipertoniya,yik}'),
('Norvasc', 'Amlodipine', 'Tablet', '10 mg', 'Pfizer', 'full', 100, 38000, '{gipertoniya,yik}'),
('Amlodipin-Nika', 'Amlodipine', 'Tablet', '10 mg', 'Nika Pharm', 'full', 100, 15000, '{gipertoniya,yik}'),
('Enap', 'Enalapril', 'Tablet', '10 mg', 'KRKA', 'full', 100, 22000, '{gipertoniya}'),
('Lorista', 'Losartan', 'Tablet', '50 mg', 'KRKA', 'full', 100, 45000, '{gipertoniya}'),
('Ventolin', 'Salbutamol', 'Aerozol', '100 mkg/doza', 'GSK', 'full', 100, 48000, '{astma,osok}'),
('Salamol Eko', 'Salbutamol', 'Aerozol', '100 mkg/doza', 'Teva', 'full', 100, 39000, '{astma,osok}'),
('Pulmicort', 'Budesonide', 'Suspenziya', '0,5 mg/ml', 'AstraZeneca', 'full', 100, 120000, '{astma}'),
('Spiriva', 'Tiotropium', 'Inhalyator', '18 mkg', 'Boehringer Ingelheim', 'full', 100, 310000, '{osok}'),
('Atrovent', 'Ipratropium', 'Aerozol', '20 mkg/doza', 'Boehringer Ingelheim', 'full', 100, 85000, '{osok}'),
('Kardiomagnil', 'Acetylsalicylic acid', 'Tablet', '75 mg', 'Takeda', 'full', 100, 18000, '{yik}'),
('Plavix', 'Clopidogrel', 'Tablet', '75 mg', 'Sanofi', 'full', 100, 140000, '{yik}');

INSERT INTO public.pharmacies (name, address, city, latitude, longitude, phone, is_dtsj_partner) VALUES
('Oxy Med Pharmacy', 'Amir Temur shoh ko''chasi 15', 'Tashkent', 41.3111, 69.2797, '+998 71 200 1010', true),
('Dori-Darmon #7', 'Navoiy ko''chasi 42', 'Tashkent', 41.3165, 69.2489, '+998 71 233 4545', true),
('Arzon Apteka', 'Bunyodkor shoh ko''chasi 7', 'Tashkent', 41.2856, 69.2034, '+998 71 277 1212', true),
('Green Cross', 'Registon ko''chasi 3', 'Samarkand', 39.6547, 66.9750, '+998 66 210 7788', false),
('Shifo Apteka', 'Mustaqillik maydoni 8', 'Bukhara', 39.7681, 64.4556, '+998 65 221 3030', true);

-- Seed: stock. Glucophage, Concor and Ventolin are out of stock everywhere to demo shortage alerts.
INSERT INTO public.pharmacy_stock (pharmacy_id, medicine_id, quantity)
SELECT p.id, m.id, v.q FROM (VALUES
  ('Oxy Med Pharmacy','Panadol',40), ('Dori-Darmon #7','Panadol',25), ('Shifo Apteka','Panadol',30), ('Green Cross','Panadol',15), ('Arzon Apteka','Panadol',20),
  ('Oxy Med Pharmacy','Glucophage',0), ('Shifo Apteka','Glucophage',0),
  ('Oxy Med Pharmacy','Siofor',18), ('Arzon Apteka','Siofor',12), ('Shifo Apteka','Siofor',9),
  ('Dori-Darmon #7','Diabeton MR',14), ('Arzon Apteka','Diabeton MR',6),
  ('Dori-Darmon #7','Lipitor',8), ('Green Cross','Lipitor',5),
  ('Oxy Med Pharmacy','Atoris',11), ('Arzon Apteka','Atoris',7),
  ('Oxy Med Pharmacy','Nurofen',30), ('Dori-Darmon #7','Nurofen',22), ('Green Cross','Nurofen',18), ('Shifo Apteka','Nurofen',10),
  ('Dori-Darmon #7','Concor',0), ('Shifo Apteka','Concor',0),
  ('Oxy Med Pharmacy','Bisoprolol-Richter',16), ('Dori-Darmon #7','Bisoprolol-Richter',10),
  ('Oxy Med Pharmacy','Norvasc',9), ('Arzon Apteka','Amlodipin-Nika',25), ('Shifo Apteka','Amlodipin-Nika',12),
  ('Dori-Darmon #7','Enap',20), ('Oxy Med Pharmacy','Lorista',8),
  ('Oxy Med Pharmacy','Ventolin',0), ('Dori-Darmon #7','Ventolin',0),
  ('Arzon Apteka','Salamol Eko',10), ('Dori-Darmon #7','Salamol Eko',6),
  ('Oxy Med Pharmacy','Pulmicort',4), ('Dori-Darmon #7','Spiriva',3), ('Arzon Apteka','Atrovent',5),
  ('Oxy Med Pharmacy','Kardiomagnil',35), ('Shifo Apteka','Kardiomagnil',20), ('Dori-Darmon #7','Plavix',6),
  ('Oxy Med Pharmacy','Augmentin',12), ('Green Cross','Augmentin',9)
) AS v(pn, bn, q)
JOIN public.pharmacies p ON p.name = v.pn
JOIN public.medicines m ON m.brand_name = v.bn;