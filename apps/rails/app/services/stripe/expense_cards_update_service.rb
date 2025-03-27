# frozen_string_literal: true

class Stripe::ExpenseCardsUpdateService
  DEFAULT_EXPENSE_INTERVAL = "monthly"
  private_constant :DEFAULT_EXPENSE_INTERVAL

  def initialize(role:)
    @role = role
  end

  def process
    role.expense_card_enabled? ? update_active_cards! : deactivate_cards!
    { success: true }
  rescue Stripe::StripeError => e
    Bugsnag.notify(e)
    { success: false, error: e.message }
  end

  private
    attr_reader :role

    def update_active_cards!
      spending_limit_value = role.expense_card_spending_limit_cents
      spending_limits = spending_limit_value > 0 ? [{ amount: spending_limit_value, interval: DEFAULT_EXPENSE_INTERVAL }] : []

      cards.find_each { _1.update_stripe_card({ spending_controls: { spending_limits: } }) }
    end

    def deactivate_cards!
      cards.find_each(&:deactivate_stripe_card!)
    end

    def cards
      role.expense_cards.active
    end
end
