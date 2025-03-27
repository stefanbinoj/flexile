# frozen_string_literal: true

RSpec.describe Stripe::ExpenseCardsUpdateService do
  let(:company) { create(:company) }
  let(:company_role) { create(:company_role, company:, expense_card_enabled: true, expense_card_spending_limit_cents: 100_00) }
  let!(:contractor) { create(:company_worker, company_role:, user: create(:user, email: "contractor@example.com")) }
  let!(:another_contractor) { create(:company_worker, company_role:, user: create(:user, country_code: "BR")) }

  subject(:service) { described_class.new(role: company_role) }

  describe "#process" do
    context "when expense cards already exist and spending limit changed" do
      let!(:expense_cards) { create_list(:expense_card, 3, company_role:, company_worker: another_contractor, active: true) }
      let!(:inactive_expense_card) { create(:expense_card, company_role:, company_worker: contractor, active: false) }
      let(:stripe_params) { { spending_controls: { spending_limits: [{ amount: 100_00, interval: "monthly" }] } } }

      before do
        allow(Stripe::Issuing::Card).to receive(:update).and_return(true)
      end

      it "updates the spending limit on Stripe" do
        expect(company_role.expense_cards.active.count).to eq(3)

        expect do
          result = service.process
          expect(result[:success]).to eq(true)
        end.to change(company_role.expense_cards.active, :count).by(0)

        expense_cards.each do |card|
          expect(Stripe::Issuing::Card).to have_received(:update).with(card.processor_reference, stripe_params)
        end
        expect(Stripe::Issuing::Card).to_not have_received(:update).with(inactive_expense_card.processor_reference, stripe_params)
      end

      context "when Stripe update fails" do
        before do
          allow(Stripe::Issuing::Card).to receive(:update)
            .with(expense_cards.first.processor_reference, stripe_params)
            .and_raise(Stripe::StripeError.new("Stripe error"))
        end

        it "returns error" do
          result = service.process
          expect(result[:success]).to eq(false)
          expect(result[:error]).to eq("Stripe error")
          expect(Stripe::Issuing::Card).to_not have_received(:update).with(inactive_expense_card.processor_reference, stripe_params)
        end
      end
    end

    context "when expense_card_enabled is false" do
      before { company_role.update(expense_card_enabled: false) }

      it "deactivates cards in Stripe and in the database" do
        active_card = create(:expense_card, company_role: company_role, company_worker: contractor, active: true)
        expect(Stripe::Issuing::Card).to receive(:update).with(active_card.processor_reference, { status: "canceled" })

        result = service.process
        expect(active_card.reload.active).to eq(false)
        expect(result[:success]).to eq(true)

        expect(company_role.expense_cards.active.count).to eq(0)
      end

      context "when Stripe update fails" do
        let!(:expense_cards) { create_list(:expense_card, 2, company_role:, company_worker: another_contractor, active: true) }
        let!(:inactive_expense_card) { create(:expense_card, company_role:, company_worker: contractor, active: false) }

        before do
          allow(Stripe::Issuing::Card).to receive(:update)
            .with(expense_cards.first.processor_reference, { status: "canceled" }).and_return(true)

          allow(Stripe::Issuing::Card).to receive(:update)
            .with(expense_cards.last.processor_reference, { status: "canceled" })
            .and_raise(Stripe::StripeError.new("Stripe error"))
        end

        it "deactivates cards until an error occurs and returns the error" do
          result = nil

          expect do
            result = service.process
          end.to change(company_role.expense_cards.active, :count).by(-1)

          expect(result[:success]).to eq(false)
          expect(result[:error]).to eq("Stripe error")
          expect(Stripe::Issuing::Card).to_not have_received(:update).with(inactive_expense_card.processor_reference, { status: "canceled" })
        end
      end
    end
  end
end
