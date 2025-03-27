# frozen_string_literal: true

RSpec.describe CompanyRoleRate do
  describe "associations" do
    it { is_expected.to belong_to(:company_role) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:pay_rate_in_subunits) }
    it { is_expected.to validate_numericality_of(:pay_rate_in_subunits).is_greater_than_or_equal_to(0).only_integer }
    it { is_expected.to validate_inclusion_of(:pay_rate_type).in_array(described_class.pay_rate_types.values) }

    context "when another record exists" do
      before { create(:company_role) } # creates a rate in an `after_build`

      it { is_expected.to validate_uniqueness_of(:company_role_id) }
    end
  end
end
