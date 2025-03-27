# frozen_string_literal: true

RSpec.describe CompanyAdministratorDigestEmailService do
  let(:company) { create(:company) }

  describe "#process" do
    before do
      @company_administrator_1 = create(:company_administrator, company:)
      @company_administrator_2 = create(:company_administrator, company:)
    end

    context "when open invoices are present" do
      before do
        allow_any_instance_of(Company).to receive_message_chain(:open_invoices_for_digest_email, :present?).and_return(true)
      end

      it "sends digest email to company administrators" do
        expect do
          expect(CompanyMailer).to receive(:digest).with(admin_id: @company_administrator_1.id).and_call_original
          expect(CompanyMailer).to receive(:digest).with(admin_id: @company_administrator_2.id).and_call_original

          described_class.new.process
        end.to have_enqueued_mail(CompanyMailer, :digest).twice
      end
    end

    context "when not-resubmitted rejected invoices are present" do
      before do
        allow_any_instance_of(Company).to receive_message_chain(:rejected_invoices_not_resubmitted, :present?).and_return(true)
      end

      it "does not send digest email to company administrators" do
        expect do
          described_class.new.process
        end.not_to have_enqueued_mail(CompanyMailer, :digest)
      end
    end

    context "when company administrator hasn't onboarded" do
      before do
        allow_any_instance_of(OnboardingState::Company).to receive(:complete?).and_return(false)
      end

      it "doesn't send digest email to the company administrator" do
        expect do
          described_class.new.process
        end.not_to have_enqueued_mail(CompanyMailer, :digest)
      end
    end

    context "when company is inactive" do
      before { company.deactivate! }

      it "doesn't send digest email to the company administrator" do
        expect do
          described_class.new.process
        end.not_to have_enqueued_mail(CompanyMailer, :digest)
      end
    end
  end
end
