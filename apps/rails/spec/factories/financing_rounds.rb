# frozen_string_literal: true

FactoryBot.define do
  factory :financing_round do
    company
    sequence(:name, "A") { "Series #{_1}" }
    issued_at { 1.year.ago }
    shares_issued { 100_000 }
    price_per_share_cents { 3_12 }
    amount_raised_cents { shares_issued * price_per_share_cents }
    post_money_valuation_cents { 500_000_00 }
    investors do
      [
        { name: "ABC Ventures", amount_invested_cents: 120_000_00 },
        { name: "Richie Rich", amount_invested_cents: 80_000_00 },
      ]
    end
    status { "Issued" }
  end
end
