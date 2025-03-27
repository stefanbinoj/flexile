# frozen_string_literal: true

class CompanyRoleApplicationPolicy < ApplicationPolicy
  def index?
    company_administrator.present?
  end

  def show?
    index?
  end

  def destroy?
    company_administrator.present? &&
    !record.denied?
  end
end
