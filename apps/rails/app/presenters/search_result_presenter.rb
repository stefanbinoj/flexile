# frozen_string_literal: true

class SearchResultPresenter
  def initialize(results)
    @results = results
  end

  def props(current_user)
    company_workers = @results[:company_workers].map { CompanyWorkerPresenter.new(_1).search_result_props }
    company_investors = @results[:company_investors].map { CompanyInvestorPresenter.new(_1).search_result_props }
    users = (company_workers + company_investors).sort_by { _1[:name] }
    {
      invoices: @results[:invoices].map { InvoicePresenter.new(_1).search_result_props(current_user) },
      users:,
    }
  end
end
