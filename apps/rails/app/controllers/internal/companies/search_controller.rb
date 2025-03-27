# frozen_string_literal: true

class Internal::Companies::SearchController < Internal::Companies::BaseController
  def show
    authorize :search

    search_user = [
      Current.company_administrator || Current.company_worker || Current.company_investor || Current.company_lawyer
    ].find(&:present?)
    records_for_search = search_user.records_for_search

    results = SearchService.new(company: Current.company,
                                records_for_search:,
                                query: params[:query]).search

    render json: SearchResultPresenter.new(results).props(Current.user)
  end
end
