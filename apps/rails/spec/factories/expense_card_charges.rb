# frozen_string_literal: true

FactoryBot.define do
  factory :expense_card_charge do
    expense_card
    company { expense_card.company_worker.company }
    total_amount_in_cents { 150_00 }
    description { Faker::Company.name }
    processor_transaction_reference { "ipi_1PdzvZFSsGLfTpetOtlDKgiC#{SecureRandom.alphanumeric(6)}" }
    processor_transaction_data do
      {
        id: processor_transaction_reference,
        card: "ic_1Pdy5EFSsGLfTpet5co8FWL9",
        type: "capture",
        amount: -total_amount_in_cents,
        object: "issuing.transaction",
        created: Time.current.to_i,
        dispute: nil,
        currency: "usd",
        livemode: false,
        metadata: {},
        cardholder: "ich_1Pdy4jFSsGLfTpetoSTPZEMM",
        network_data: {
          transaction_id: "test_#{SecureRandom.random_number(10**12)}",
          processing_date: Date.current.strftime("%Y-%m-%d"),
          authorization_code: "S#{SecureRandom.random_number(10**5)}",
        },
        authorization: nil,
        merchant_data: {
          url: "https://rocketrides.io/",
          city: "San Francisco",
          name: description,
          state: "CA",
          country: "US",
          category: "airlines_air_carriers",
          network_id: "1234567890",
          postal_code: "94101",
          terminal_id: "99999999",
          category_code: "4511",
        },
        amount_details: { atm_fee: nil, cashback_amount: 0 },
        merchant_amount: -total_amount_in_cents,
        merchant_currency: "usd",
        balance_transaction: "txn_#{SecureRandom.alphanumeric(24)}",
      }
    end
  end
end
