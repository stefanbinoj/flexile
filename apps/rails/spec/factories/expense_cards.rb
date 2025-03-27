# frozen_string_literal: true

FactoryBot.define do
  factory :expense_card do
    company_role
    company_worker
    processor_reference { "card_#{SecureRandom.alphanumeric(24)}" }
    card_last4 { rand(1000..9999).to_s }
    card_exp_month { rand(1..12) }
    card_exp_year { Date.current.year + rand(1..5) }
    card_brand { "visa" }
    processor { "stripe" }
    active { true }
  end
end
