# frozen_string_literal: true

RSpec.describe Company::DigestEmail do
  let(:company) { create(:company) }

  describe "#open_invoices_for_digest_email" do
    before do
      @open_invoice = create(:invoice, company:)
      create(:invoice, :failed, company:)
      @invoice_with_insufficient_approvals = create(:invoice, :approved, company:)
      create(:invoice, :fully_approved, company:)
      create(:invoice, :paid, company:)
    end

    it "returns the list of open invoices" do
      expect(company.open_invoices_for_digest_email).to match_array([@open_invoice, @invoice_with_insufficient_approvals])
    end
  end

  describe "#rejected_invoices_not_resubmitted" do
    before do
      contractor_1 = create(:company_worker, company:)
      create(:invoice, :rejected, user: contractor_1.user, company:)
      create(:invoice, user: contractor_1.user, company:)

      contractor_2 = create(:company_worker, company:)
      @rejected_invoice = create(:invoice, :rejected, user: contractor_2.user, company:)

      inactive_contractor = create(:company_worker, ended_at: Time.current, company:)
      create(:invoice, :rejected, user: inactive_contractor.user, company:)
    end

    it "returns the list of rejected, but not resubmitted invoices of active contractors" do
      expect(company.rejected_invoices_not_resubmitted).to eq [@rejected_invoice]
    end
  end

  describe "#invoices_pending_approval_from" do
    before do
      @invoice_1 = create(:invoice, company:)
      @invoice_2 = create(:invoice, company:)

      @company_administrator_1 = create(:company_administrator, company:)
      @company_administrator_2 = create(:company_administrator, company:)

      create(:invoice_approval, invoice: @invoice_1, approver: @company_administrator_1.user)
      create(:invoice_approval, invoice: @invoice_1, approver: @company_administrator_2.user)

      create(:invoice_approval, invoice: @invoice_2, approver: @company_administrator_1.user)
    end

    it "returns the invoices pending approval from the given administrator" do
      expect(company.invoices_pending_approval_from(@company_administrator_2)).to eq [@invoice_2]
    end

    it "returns empty array when admin has approved all invoices" do
      expect(company.invoices_pending_approval_from(@company_administrator_1)).to be_empty
    end
  end

  describe "#processing_invoices_for_digest_email" do
    before do
      @company_administrator_1 = create(:company_administrator, company:)

      @invoice_1 = create(:invoice, status: Invoice::PROCESSING, company:)
      @invoice_2 = create(:invoice, status: Invoice::APPROVED, invoice_approvals_count: company.required_invoice_approval_count, company:)
    end

    it "returns the list of processing invoices for digest email" do
      expect(company.processing_invoices_for_digest_email).to match_array([@invoice_1, @invoice_2])
    end
  end
end
