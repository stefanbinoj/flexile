# frozen_string_literal: true

class CompanyRolePolicy < ApplicationPolicy
  def index?
    company_administrator.present?
  end

  def create?
    company_administrator.present?
  end

  def update?
    company_administrator.present?
  end

  def destroy?
    company_administrator.present?
  end
end
