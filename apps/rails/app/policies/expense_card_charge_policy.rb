# frozen_string_literal: true

class ExpenseCardChargePolicy < ApplicationPolicy
  def index?
    company.expense_cards_enabled? && (company_worker.present? || company_administrator.present?)
  end
end
