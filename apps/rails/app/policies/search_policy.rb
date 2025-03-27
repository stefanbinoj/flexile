# frozen_string_literal: true

class SearchPolicy < ApplicationPolicy
  def show?
    company_administrator.present? || company_worker.present? || company_investor.present? || company_lawyer.present?
  end
end
