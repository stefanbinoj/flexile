# frozen_string_literal: true

class ExpenseCardGrantEmailJob
  include Sidekiq::Worker
  sidekiq_options retry: 5

  def perform(company_worker_id)
    CompanyWorkerMailer.expense_card_grant(company_worker_id:).deliver_now
  end
end
