# frozen_string_literal: true

RSpec.describe Stripe::IssueExpenseCardService, :vcr do
  let(:company) { create(:company) }
  let(:company_role) { create(:company_role, company:, expense_card_enabled: true, expense_card_spending_limit_cents: 100_00) }
  let(:company_worker) { create(:company_worker, company_role:, user: create(:user, email: "john@gumroad.com")) }
  let(:ip_address) { Faker::Internet.public_ip_v4_address }
  let(:browser_user_agent) { Faker::Internet.user_agent }

  subject(:service) { described_class.new(company_worker:, ip_address:, browser_user_agent:) }

  describe "#process" do
    context "when expense cards are not enabled for the company" do
      before { company_role.update(expense_card_enabled: false) }

      it "returns an error" do
        result = service.process
        expect(result[:success]).to be false
        expect(result[:error]).to eq("Expense cards are not enabled for this company")
      end
    end

    context "when contractor already has an active expense card" do
      before { create(:expense_card, company_worker:, active: true) }

      it "returns an error" do
        result = service.process
        expect(result[:success]).to be false
        expect(result[:error]).to eq("You have already issued an expense card")
      end
    end

    context "when contractor is not authorized to create an expense card" do
      before { allow(company_worker).to receive(:can_create_expense_card?).and_return(false) }

      it "returns an error" do
        result = service.process
        expect(result[:success]).to be false
        expect(result[:error]).to eq("You are not authorized to issue an expense card")
      end
    end

    context "when all conditions are met" do
      before { create(:expense_card, company_worker:, active: false) }

      it "creates Stripe cardholder, card and creates a new expense card" do
        allow(Stripe::Issuing::Card).to receive(:create).and_call_original

        result = service.process
        expect(result[:success]).to be true
        expect(result[:expense_card]).to have_attributes(
          company_role: company_role,
          active: true,
          processor_reference: "ic_1PiotpFSsGLfTpethGsD0SrA",
          processor: "stripe",
          card_last4: "0369",
          card_exp_month: "7",
          card_exp_year: "2027",
          card_brand: "Visa",
        )
        expect(Stripe::Issuing::Card).to have_received(:create).with(
          hash_including(spending_controls: { spending_limits: [{ amount: 100_00, interval: "monthly" }] })
        )
      end

      it "uses an existing Stripe cardholder if one exists" do
        allow(Stripe::Issuing::Cardholder).to receive(:create).and_raise(Stripe::InvalidRequestError.new("Cardholder already exists", "already_exists"))

        expect do
          service.process
        end.to change(company_worker.expense_cards, :count).by(1)

        expect(Stripe::Issuing::Cardholder).to_not have_received(:create)
      end

      context "when there is no spending limit" do
        before do
          company_role.update!(expense_card_spending_limit_cents: 0)
          allow(Stripe::Issuing::Card).to receive(:create).and_call_original
        end

        it "creates a card without spending limits" do
          result = service.process
          expect(result[:success]).to be true
          expect(Stripe::Issuing::Card).to have_received(:create).with(
            hash_including(spending_controls: { spending_limits: [] })
          )
        end
      end

      context "when country is not supported" do
        before do
          company_worker.update(user: create(:user, country_code: "BR", email: "joao@gumroad.com"))
        end

        it "returns an error" do
          result = service.process
          expect(result[:success]).to be false
          expect(result[:error]).to eq("Cardholder cannot have a billing address country of BR.")
        end
      end
    end

    context "when Stripe raises an error" do
      before do
        allow(Stripe::Issuing::Card).to receive(:create).and_raise(Stripe::StripeError.new("Stripe error"))
      end

      it "returns an error" do
        result = service.process
        expect(result[:success]).to be false
        expect(result[:error]).to eq("Stripe error")
      end
    end
  end
end
