# frozen_string_literal: true

class Stripe::IssueExpenseCardService
  STRIPE_CARDHOLDER_TYPE = "individual"
  STRIPE_ACTIVE_STATUS = "active"
  STRIPE_CURRENCY = "usd"
  STRIPE_CARD_TYPE = "virtual"
  DEFAULT_EXPENSE_INTERVAL = "monthly"
  private_constant :STRIPE_CARDHOLDER_TYPE, :STRIPE_ACTIVE_STATUS, :STRIPE_CURRENCY, :STRIPE_CARD_TYPE, :DEFAULT_EXPENSE_INTERVAL

  def initialize(company_worker:, ip_address:, browser_user_agent:)
    @company_worker = company_worker
    @company_role = company_worker.company_role
    @ip_address = ip_address
    @browser_user_agent = browser_user_agent
  end

  def process
    return { success: false, error: "Expense cards are not enabled for this company" } unless company_role.expense_card_enabled?
    return { success: false, error: "You have already issued an expense card" } if company_worker.active_expense_card.present?
    return { success: false, error: "You are not authorized to issue an expense card" } unless company_worker.can_create_expense_card?

    spending_limits = company_role.expense_card_has_limit? ?
      [{ amount: company_role.expense_card_spending_limit_cents, interval: DEFAULT_EXPENSE_INTERVAL }] : []

    stripe_card = Stripe::Issuing::Card.create(
      cardholder: create_or_get_cardholder(company_worker),
      currency: STRIPE_CURRENCY,
      type: STRIPE_CARD_TYPE,
      status: STRIPE_ACTIVE_STATUS,
      spending_controls: { spending_limits: },
      metadata: { company_worker_id: company_worker.id },
    )

    expense_card = company_worker.expense_cards.new(
      company_role:,
      processor_reference: stripe_card.id,
      processor: :stripe,
      card_last4: stripe_card.last4,
      card_exp_month: stripe_card.exp_month,
      card_exp_year: stripe_card.exp_year,
      card_brand: stripe_card.brand,
      active: true,
    )

    if expense_card.save
      { success: true, expense_card: }
    else
      { success: false, error: expense_card.errors.full_messages.to_sentence }
    end
  rescue Stripe::StripeError => e
    { success: false, error: e.message }
  end

  private
    attr_reader :company_worker, :company_role, :ip_address, :browser_user_agent

    def create_or_get_cardholder(company_worker)
      existing_cardholder = Stripe::Issuing::Cardholder.list(
        email: company_worker.user.email,
        status: STRIPE_ACTIVE_STATUS,
        limit: 1,
      ).data.first

      return existing_cardholder.id if existing_cardholder

      user = company_worker.user
      first_name = user.legal_name.split[0..-2].join(" ")
      last_name = user.legal_name.split.last

      new_cardholder = Stripe::Issuing::Cardholder.create(
        type: STRIPE_CARDHOLDER_TYPE,
        name: user.legal_name,
        email: user.email,
        status: STRIPE_ACTIVE_STATUS,
        individual: {
          first_name:,
          last_name:,
          card_issuing: {
            user_terms_acceptance: { date: Time.current.to_i, ip: ip_address, user_agent: browser_user_agent },
          },
        },
        billing: {
          address: {
            line1: user.street_address,
            city: user.city,
            state: user.state,
            postal_code: user.zip_code,
            country: user.country_code,
          },
        },
      )

      new_cardholder.id
    end
end
