# frozen_string_literal: true

class Internal::Companies::SigneeSearchController < Internal::Companies::BaseController
  def show
    authorize :signee_search

    results = SigneeSearchService.new(company: Current.company, query: params[:query]).search

    render json: SigneeSearchResultPresenter.new(results).props
  end
end
