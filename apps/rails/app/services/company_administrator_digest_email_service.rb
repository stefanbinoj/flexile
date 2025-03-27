# frozen_string_literal: true

class CompanyAdministratorDigestEmailService
  INVOICE_SUBMISSION_PERIOD = 3..6 # 3rd - 6th of the month
  private_constant :INVOICE_SUBMISSION_PERIOD

  def process
    Company.active.find_each do |company|
      next unless send_digest_email?(company)
      next unless company.completed_onboarding?

      company.company_administrators.ids.each do
        CompanyMailer.digest(admin_id: _1).deliver_later
      end
    end
  end

  private
    def send_digest_email?(company)
      return true if company.open_invoices_for_digest_email.present?

      false
    end
end
