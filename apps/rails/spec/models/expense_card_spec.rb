# frozen_string_literal: true

RSpec.describe ExpenseCard do
  it { is_expected.to belong_to(:company_role) }
  it { is_expected.to belong_to(:company_worker) }
  it { is_expected.to have_many(:expense_card_charges) }
  it { is_expected.to have_one(:company).through(:company_role) }

  describe "validations" do
    it { is_expected.to validate_presence_of(:processor_reference) }
    it { is_expected.to validate_presence_of(:processor) }
    it { is_expected.to validate_presence_of(:card_last4) }
    it { is_expected.to validate_presence_of(:card_exp_month) }
    it { is_expected.to validate_presence_of(:card_exp_year) }
    it { is_expected.to validate_presence_of(:card_brand) }
    it { is_expected.to define_enum_for(:processor)
                          .with_values(stripe: "stripe")
                          .backed_by_column_of_type(:enum)
                          .with_prefix(:processor) }
  end

  describe "scopes" do
    describe ".active" do
      it "returns only active cards" do
        active_card = create(:expense_card, active: true)
        create(:expense_card, active: false)

        expect(described_class.active).to eq([active_card])
      end
    end
  end
end
