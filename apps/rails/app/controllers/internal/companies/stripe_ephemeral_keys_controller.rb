# frozen_string_literal: true

class Internal::Companies::StripeEphemeralKeysController < Internal::Companies::BaseController
  before_action :load_expense_card!


  def create
    authorize @expense_card, :show?

    ephemeral_key = Stripe::EphemeralKey.create(
      { nonce: params[:nonce], issuing_card: @expense_card.processor_reference },
      { stripe_version: Stripe.api_version },
    )

    render json: { secret: ephemeral_key.secret }
  rescue Stripe::InvalidRequestError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private
    def load_expense_card!
      @expense_card = Current.company_worker!
        .expense_cards
        .processor_stripe
        .find_by!(processor_reference: params[:processor_reference])
    end
end
