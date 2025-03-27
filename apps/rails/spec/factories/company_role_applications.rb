# frozen_string_literal: true

FactoryBot.define do
  factory :company_role_application do
    company_role
    name { Faker::Name.name }
    email { generate :email }
    country_code { "US" }
    description { Faker::Quote.famous_last_words }
    hours_per_week { Faker::Number.between(from: 20, to: 35) }
    weeks_per_year { Faker::Number.between(from: 30, to: 50) }
    equity_percent { Faker::Number.between(from: 0, to: 80) }

    trait :project_based do
      hours_per_week { nil }
      weeks_per_year { nil }
      equity_percent { 0 }
    end

    trait :salary do
      hours_per_week { nil }
      weeks_per_year { nil }
      equity_percent { 20 }
    end
  end
end
