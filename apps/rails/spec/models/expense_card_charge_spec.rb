# frozen_string_literal: true

RSpec.describe ExpenseCardCharge do
  describe "associations" do
    it { is_expected.to belong_to(:expense_card) }
    it { is_expected.to belong_to(:company) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:description) }
    it { is_expected.to validate_presence_of(:total_amount_in_cents) }
    it { is_expected.to validate_presence_of(:processor_transaction_reference) }
    it { is_expected.to validate_presence_of(:processor_transaction_data) }
    it { is_expected.to validate_numericality_of(:total_amount_in_cents).is_greater_than(0).only_integer }
  end

  describe "#merchant_name" do
    let(:expense_card_charge) { build(:expense_card_charge, processor_transaction_data: { merchant_data: { name: "Starbucks" } }) }

    it "returns the merchant name" do
      expect(expense_card_charge.merchant_name).to eq("Starbucks")
    end
  end
end
