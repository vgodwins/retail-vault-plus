-- Fix Security Issue #1: Restrict profiles table access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix Security Issue #2: Restrict invoices table access
DROP POLICY IF EXISTS "All authenticated can view invoices" ON public.invoices;

CREATE POLICY "Managers and admins can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "All authenticated can view invoice items" ON public.invoice_items;

CREATE POLICY "Managers and admins can view invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Fix Security Issue #3: Restrict transactions table access
DROP POLICY IF EXISTS "All authenticated can view transactions" ON public.transactions;

CREATE POLICY "Managers and admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Cashiers can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'cashier') AND 
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "All authenticated can view transaction items" ON public.transaction_items;

CREATE POLICY "Managers and admins can view all transaction items"
  ON public.transaction_items FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Cashiers can view own transaction items"
  ON public.transaction_items FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'cashier') AND 
    EXISTS (
      SELECT 1 FROM public.transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "All authenticated can view payments" ON public.transaction_payments;

CREATE POLICY "Managers and admins can view all payments"
  ON public.transaction_payments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Cashiers can view own payments"
  ON public.transaction_payments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'cashier') AND 
    EXISTS (
      SELECT 1 FROM public.transactions 
      WHERE transactions.id = transaction_payments.transaction_id 
      AND transactions.created_by = auth.uid()
    )
  );

-- Fix Security Issue #8: Restrict expenditures table access
DROP POLICY IF EXISTS "All authenticated can view expenditures" ON public.expenditures;

CREATE POLICY "Managers and admins can view expenditures"
  ON public.expenditures FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );