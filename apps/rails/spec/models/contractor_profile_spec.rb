# frozen_string_literal: true

RSpec.describe ContractorProfile do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    subject { build(:contractor_profile) }
    it { is_expected.to validate_numericality_of(:available_hours_per_week).is_greater_than(0) }
    it { is_expected.to validate_uniqueness_of(:user_id) }
  end
end
