# frozen_string_literal: true

class Internal::Companies::RolesController < Internal::Companies::BaseController
  before_action :load_company_role!, only: [:update, :destroy]


  def index
    authorize CompanyRole
    render json: CompanyRolePresenter.index_props(company: Current.company)
  end

  def create
    authorize CompanyRole

    company_role = Current.company.company_roles.new(permitted_params)
    company_role.build_rate(rate_params.merge(
                              pay_rate_type: rate_params[:pay_rate_type] || CompanyRoleRate.pay_rate_types[:hourly],
                              pay_rate_currency: Current.company.default_currency,
                            ))

    if company_role.save
      render json: { id: company_role.external_id }
    else
      render json: { error_message: company_role.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  def update
    authorize @company_role

    service_params = permitted_params.merge(update_all_rates: params[:update_all_rates])
    result = UpdateCompanyRoleService.new(role: @company_role, params: service_params, rate_params:).process

    if result[:success]
      head :no_content
    else
      render json: { error_message: result[:error] }, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @company_role
    @company_role.mark_deleted!
    head :no_content
  end

  private
    def load_company_role!
      @company_role = Current.company.company_roles.find_by!(external_id: params[:id])
    end

    def permitted_params
      params.require(:role).permit(
        :name, :capitalized_expense, :actively_hiring, :trial_enabled, :job_description, :expense_account_id, :expense_card_enabled, :expense_card_spending_limit_cents
      )
    end

    def rate_params
      params.require(:role).permit(:pay_rate_in_subunits, :trial_pay_rate_in_subunits, :pay_rate_type)
    end
end
