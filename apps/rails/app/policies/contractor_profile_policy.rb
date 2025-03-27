# frozen_string_literal: true

class ContractorProfilePolicy < ApplicationPolicy
  def index?
    company_administrator.present?
  end

  def show?
    index?
  end
end
