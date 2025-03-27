# frozen_string_literal: true

class ExpenseCardPolicy < ApplicationPolicy
  def create?
    company.expense_cards_enabled? && company_worker.present?
  end

  def show?
    create?
  end
end
