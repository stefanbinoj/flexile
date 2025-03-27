# frozen_string_literal: true

RSpec.describe "Contractor profiles" do
  include ActionView::Helpers::NumberHelper

  let!(:company) { create(:company) }
  let(:hourly_contractors) { create_list(:user, 3, :contractor) }
  let(:company_admin) { create(:company_administrator, company:) }
  let(:project_based_contractor) { create(:company_worker, :project_based) }
  let!(:contractors) { hourly_contractors + [project_based_contractor.user] }

  def format_money(number)
    number_to_currency(number, strip_insignificant_zeros: number.to_i == number)
  end

  before do
    login_as company_admin.user
  end

  it "lists contractor profiles for hourly contractors" do
    visit spa_company_contractor_profiles_path(company.external_id)

    expect(page).to have_selector "h1", text: "Talent pool"
    expect(page).to have_table(rows: contractors.map do |contractor|
      first_company_worker = contractor.company_workers.first!
      {
        "Name" => contractor.name,
        "Role" => first_company_worker.company_role.name,
        "Rate" => "#{format_money(first_company_worker.pay_rate_usd)} / #{first_company_worker.pay_rate_type == 'hourly' ? 'hour' : 'project'}",
        "Availability" => "#{contractor.contractor_profile.available_hours_per_week} #{contractor.contractor_profile.available_hours_per_week == 1 ? 'hour' : 'hours'} / week",
        "Country" => contractor.display_country,
      }
    end)

    contractor = contractors.first
    contractor_profile = contractor.contractor_profile
    first_company_worker = contractor.company_workers.first!
    find(:table_row, { "Name" => contractor.name }).click

    expect(page).to have_selector "h1", text: "Talent"
    expect(page).to have_selector "h1", text: contractor.name
    expect(page).to have_link "Message", href: "mailto:#{contractor.email}"
    expect(page).to have_text "Role #{first_company_worker.company_role.name}", normalize_ws: true
    expect(page).to have_text contractor_profile.description
    expect(page).to have_text "Availability #{contractor_profile.available_hours_per_week}", normalize_ws: true
    expect(page).to have_text "Country #{contractor.display_country}", normalize_ws: true
    expect(page).to have_text "Rate #{format_money(first_company_worker.pay_rate_usd)} / hour", normalize_ws: true
    expect(page).to have_text "Email #{contractor.email}", normalize_ws: true
  end

  it "lists contractor profiles for project-based contractors" do
    visit spa_company_contractor_profiles_path(company.external_id)
    select_tab "Talent pool"
    find(:table_row, { "Name" => project_based_contractor.user.name }).click
    expect(page).to have_text "Rate #{format_money(project_based_contractor.pay_rate_usd)} / project", normalize_ws: true
  end
end
