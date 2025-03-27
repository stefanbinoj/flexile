# frozen_string_literal: true

class SigneeSearchPolicy < ApplicationPolicy
  def show?
    company_lawyer.present?
  end
end
