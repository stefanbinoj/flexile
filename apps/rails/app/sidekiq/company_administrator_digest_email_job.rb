# frozen_string_literal: true

class CompanyAdministratorDigestEmailJob
  include Sidekiq::Job
  sidekiq_options retry: 5

  def perform
    CompanyAdministratorDigestEmailService.new.process
  end
end
