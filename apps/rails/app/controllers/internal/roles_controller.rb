# frozen_string_literal: true

class Internal::RolesController < Internal::BaseController
  def index
    company = Company.find_by(external_id: params[:company_id]) || e404
    render json: CompanyRolePresenter.actively_hiring_props(company:)
  end

  def show
    role = CompanyRole.find_by(external_id: params[:id])
    e404 unless role

    render json: CompanyRolePresenter.new(role).props(ip_country: GeoIp.lookup(request.ip)&.country_code)
  end
end
