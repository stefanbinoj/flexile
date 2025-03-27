# frozen_string_literal: true

class CompanyNavigationPresenter
  def initialize(user:, company:, selected_access_role: nil)
    @company = company
    @user = user
    @access_roles = determine_access_roles(user, company)
    @selected_access_role = if Flipper.enabled?(:role_switch, user)
      selected_access_role || @access_roles.first
    else
      nil
    end
  end

  def props
    current_context = CurrentContext.new(user:, company:, role: selected_access_role)
    {
      id: company.external_id,
      name: company.display_name,
      logo_url: company.logo_url,
      routes: CompanyNavigationPresenter::RoutesInfo.new(current_context:).props,
      selected_access_role:,
      other_access_roles: other_access_roles(selected_access_role),
    }
  end

  private
    attr_reader :company, :user, :access_roles
    attr_accessor :selected_access_role

    def determine_access_roles(user, company)
      return [] unless Flipper.enabled?(:role_switch, user)

      Company::ACCESS_ROLES.keys.select do |access_role|
        user.public_send(:"company_#{access_role}_for?", company)
      end
    end

    # If the user is both a contractor and an investor, ignore the investor role as it's combined with the contractor role
    # See CurrentContext#company_worker and #company_investor for more details
    def other_access_roles(selected_access_role)
      access_roles
        .reject { _1 == selected_access_role }
        .reject { _1 == Company::ACCESS_ROLE_INVESTOR && access_roles.include?(Company::ACCESS_ROLE_WORKER) }
    end
end
