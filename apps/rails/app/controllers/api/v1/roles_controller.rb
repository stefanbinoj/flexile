# frozen_string_literal: true

class Api::V1::RolesController < Api::V1::BaseController
  def index
    company = Company.find(params[:company_id])
    render xml: company.company_roles.actively_hiring.map { CompanyRolePresenter.new(_1).api_props }
  end
end
