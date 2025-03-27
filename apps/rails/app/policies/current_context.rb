# frozen_string_literal: true

# Determines roles for the logged-in user based on the company and role selected
# If the role is nil (feature not enabled), all available roles are returned
#
class CurrentContext
  def self.from_current(current)
    new(
      user: current.user,
      company: current.company,
      role: current.role,
    )
  end

  attr_reader :user, :company, :role

  def initialize(user:, company:, role:)
    @user = user
    @company = company
    @role = role
  end

  def company_administrator
    @_company_administrator ||= if role.blank? || role == Company::ACCESS_ROLE_ADMINISTRATOR
      user&.company_administrator_for(company)
    else
      nil
    end
  end

  def company_worker
    @_company_worker ||= if role.blank? || role.in?([Company::ACCESS_ROLE_WORKER, Company::ACCESS_ROLE_INVESTOR, Company::ACCESS_ROLE_ADMINISTRATOR])
      user&.company_worker_for(company)
    else
      nil
    end
  end

  def company_investor
    @_company_investor ||= if role.blank? || role.in?([Company::ACCESS_ROLE_INVESTOR, Company::ACCESS_ROLE_WORKER, Company::ACCESS_ROLE_ADMINISTRATOR])
      user&.company_investor_for(company)
    else
      nil
    end
  end

  def company_lawyer
    @_company_lawyer ||= if role.blank? || role == Company::ACCESS_ROLE_LAWYER
      user&.company_lawyer_for(company)
    else
      nil
    end
  end

  def company_administrator?
    company_administrator.present?
  end

  def company_worker?
    company_worker.present?
  end

  def company_investor?
    company_investor.present?
  end

  def company_lawyer?
    company_lawyer.present?
  end

  def inspect
    "#<CurrentContext user_email=#{user&.email} company_name=#{company&.name} role=#{role}>"
  end
end
