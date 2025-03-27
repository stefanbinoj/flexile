# frozen_string_literal: true

class ContractorProfile < ApplicationRecord
  include ExternalId

  belongs_to :user

  validates :available_hours_per_week, numericality: { greater_than: 0 }
  validates :user_id, uniqueness: true
end
