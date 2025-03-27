# frozen_string_literal: true

RSpec.describe Quickbooks::ExpenseAccountSelector do
  describe "#get_expense_account_id" do
    subject(:get_expense_account_id) { described_class.new(integration:, company_worker:, line_item:).get_expense_account_id }

    let(:integration) { create(:quickbooks_integration) }
    let(:company_worker) { create(:company_worker) }

    context "when the contractor's role has an expense account associated" do
      before do
        company_worker.company_role.update!(expense_account_id: "Account!")
      end

      context "when the line item is an invoice expense" do
        let(:expense_category) { create(:expense_category, name: "Travel", expense_account_id: "22") }
        let(:line_item) { create(:invoice_expense, expense_category:) }

        it "returns the category's expenses account id" do
          expect(get_expense_account_id).to eq(expense_category.expense_account_id)
        end
      end

      context "when the line item is an invoice line item" do
        let(:line_item) { create(:invoice_line_item) }

        it "returns the role's expense account id" do
          expect(get_expense_account_id).to eq("Account!")
        end
      end

      context "when the line item is nil" do
        let(:line_item) { nil }

        it "returns the role's expense account id" do
          expect(get_expense_account_id).to eq("Account!")
        end
      end
    end

    context "when the contractor's role does not have an expense account associated" do
      context "when the line item is an invoice expense" do
        let(:expense_category) { create(:expense_category, name: "Meals", expense_account_id: "23") }
        let(:line_item) { create(:invoice_expense, expense_category:) }

        it "returns the category's expenses account id" do
          expect(get_expense_account_id).to eq(expense_category.expense_account_id)
        end
      end

      context "when the line item is an invoice line item" do
        let(:line_item) { create(:invoice_line_item) }

        it "returns the default consulting services expense account id" do
          expect(get_expense_account_id).to eq(integration.consulting_services_expense_account_id)
        end
      end

      context "when the line item is nil" do
        let(:line_item) { nil }

        it "returns the default consulting services expense account id" do
          expect(get_expense_account_id).to eq(integration.consulting_services_expense_account_id)
        end
      end
    end
  end
end
