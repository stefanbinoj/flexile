# frozen_string_literal: true

class ExpenseCardCharge < ApplicationRecord
  belongs_to :expense_card
  belongs_to :company
  has_one :company_worker, through: :expense_card

  validates :description, :total_amount_in_cents, :processor_transaction_reference, :processor_transaction_data, presence: true
  validates :total_amount_in_cents, numericality: { only_integer: true, greater_than: 0 }

  def merchant_name
    processor_transaction_data.dig("merchant_data", "name")
  end
end
