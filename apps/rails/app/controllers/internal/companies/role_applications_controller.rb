# frozen_string_literal: true

class Internal::Companies::RoleApplicationsController < Internal::Companies::BaseController
  before_action :load_company_role_application!, only: [:show, :destroy]


  def index
    authorize CompanyRoleApplication
    role = Current.company.company_roles.find_by!(external_id: params[:role_id])
    render json: CompanyRoleApplicationPresenter.index_props(role:)
  end

  def show
    authorize @company_role_application
    render json: CompanyRoleApplicationPresenter.new(@company_role_application).props
  end

  def destroy
    authorize @company_role_application
    @company_role_application.denied!
    head :no_content
  end

  private
    def load_company_role_application!
      @company_role_application = Current.company.company_role_applications.pending.find_by!(id: params[:id])
    end
end
