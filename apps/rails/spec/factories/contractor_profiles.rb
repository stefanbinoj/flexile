# frozen_string_literal: true

FactoryBot.define do
  factory :contractor_profile do
    association :user, factory: [:user, :contractor]
    available_for_hire { true }
    available_hours_per_week { rand(1..35) }
    description { Faker::Quote.famous_last_words }
  end
end
