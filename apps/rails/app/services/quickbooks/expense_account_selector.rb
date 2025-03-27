# frozen_string_literal: true

class Quickbooks::ExpenseAccountSelector
  def initialize(integration:, company_worker:, line_item: nil)
    @integration = integration
    @company_worker = company_worker
    @line_item = line_item
  end

  def get_expense_account_id
    return line_item.expense_account_id if line_item.is_a?(InvoiceExpense)

    company_worker.company_role.expense_account_id || integration.consulting_services_expense_account_id
  end

  private
    attr_reader :integration, :company_worker, :line_item
end
