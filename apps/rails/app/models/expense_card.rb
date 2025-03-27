# frozen_string_literal: true

class ExpenseCard < ApplicationRecord
  belongs_to :company_role
  belongs_to :company_worker, foreign_key: :company_contractor_id
  has_many :expense_card_charges
  has_one :company, through: :company_role

  enum :processor, { stripe: "stripe" }, prefix: true

  validates :processor_reference, :processor, :card_last4, :card_exp_month, :card_exp_year, :card_brand, presence: true

  scope :active, -> { where(active: true) }

  def update_stripe_card(params)
    Stripe::Issuing::Card.update(processor_reference, params)
  end

  def deactivate_stripe_card!
    Stripe::Issuing::Card.update(processor_reference, { status: "canceled" })
    update!(active: false)
  end
end
