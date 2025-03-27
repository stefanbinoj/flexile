# frozen_string_literal: true

class Internal::Companies::SwitchController < Internal::Companies::BaseController
  def create
    skip_authorization

    switch_role(access_role) if access_role_valid?
    render json: UserPresenter.new(current_context: pundit_user, selected_access_roles_by_company:).logged_in_user
  end

  private
    def access_role
      params[:access_role]&.to_sym
    end

    def access_role_valid?
      access_role.present? &&
        Company::ACCESS_ROLES.key?(access_role) &&
        Current.user.public_send(:"company_#{access_role}_for?", Current.company)
    end
end
