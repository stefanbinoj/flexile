# frozen_string_literal: true

class CompanyRoleRate < ApplicationRecord
  belongs_to :company_role

  enum :pay_rate_type, {
    hourly: 0,
    project_based: 1,
    salary: 2,
  }, validate: true

  validates :company_role_id, uniqueness: true
  validates :pay_rate_in_subunits, presence: true, numericality: { greater_than_or_equal_to: 0, only_integer: true }
end
