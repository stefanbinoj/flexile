# frozen_string_literal: true

class CompanyRoleApplicationPresenter
  attr_reader :application, :company, :company_role

  def initialize(application)
    @application = application
    @company_role = application.company_role
    @company = @company_role.company
  end

  def self.index_props(role:)
    {
      role: role.slice(:name, :pay_rate_type),
      applications: role.company_role_applications.pending.select(:id, :name, :created_at, :hours_per_week),
    }
  end

  def props
    application_ids = company_role.company_role_applications.pending.pluck(:id)
    index = application_ids.index(application.id)
    {
      application: application.slice(:email, :name, :created_at, :hours_per_week, :weeks_per_year, :description, :equity_percent).merge(country: application.display_country),
      role: company_role.slice(:name, :pay_rate_in_subunits, :pay_rate_type).merge(id: company_role.external_id),
      company: {
        share_price_usd: company.share_price_in_usd.to_f,
        exercise_price_usd: company.fmv_per_share_in_usd.to_f,
      },
      pagination: { index:, count: application_ids.count, prev: index > 0 ? application_ids[index - 1] : nil, next: index < application_ids.length - 1 ? application_ids[index + 1] : nil },
    }
  end

  def email_props
    annual_compensation = if company_role.project_based?
      0
    elsif company_role.salary?
      company_role.pay_rate_in_subunits / 100.0
    else
      company_role.pay_rate_in_subunits / 100.0 * application.hours_per_week * application.weeks_per_year
    end
    {
      application: application
                     .slice(:id, :name, :hours_per_week, :weeks_per_year)
                     .merge(
                       country: application.display_country,
                       annual_compensation:,
                       description: Rails::HTML4::SafeListSanitizer.new.sanitize(application.description),
                       equity_percent: company.equity_compensation_enabled? ? application.equity_percent : nil
                     ),
      company: { id: company.external_id, name: company.display_name },
    }
  end
end
