# frozen_string_literal: true

class ExpenseCardPresenter
  delegate :processor_reference, :processor, :card_last4, :card_exp_month, :card_exp_year, :card_brand, :active, to: :expense_card

  def initialize(expense_card)
    @expense_card = expense_card
  end

  def props
    {
      active:,
      processor_reference:,
      processor:,
      last4: card_last4,
      exp_month: card_exp_month.rjust(2, "0"),
      exp_year: card_exp_year.last(2),
      brand: card_brand,
      address: address_props(expense_card.company_worker.user),
    }
  end

  private
    attr_reader :expense_card

    def address_props(user)
      {
        street_address: user.street_address,
        city: user.city,
        zip_code: user.zip_code,
        state: user.state,
        country: user.display_country,
      }
    end
end
