# frozen_string_literal: true

# Creates a consulting contract document when the first party signs it
# First signature can be by either a company worker or a company administrator
#
class CreateConsultingContract
  def initialize(company_worker:, company_administrator:, current_user:)
    @company_worker = company_worker
    @company_administrator = company_administrator
    @current_user = current_user
  end

  def perform!
    attributes = {
      name: Contract::CONSULTING_CONTRACT_NAME,
      document_type: :consulting_contract,
      year: Date.current.year,
      user: company_worker.user,
      company_administrator:,
      company: company_worker.company,
    }.compact
    company_worker.uncompleted_contracts.each(&:mark_deleted!)
    company_worker.documents.create!(attributes)
  end

  private
    attr_reader :company_worker, :company_administrator, :current_user
end
