# frozen_string_literal: true

RSpec.describe "Role applications" do
  include ActionView::Helpers::NumberHelper

  let!(:company) { create(:company) }
  let!(:company_role) { create(:company_role, company:, actively_hiring: true) }
  let!(:applications) { create_list(:company_role_application, 2, company_role:) }
  let(:company_administrator) { create(:company_administrator, company:) }

  def format_money(number)
    number_to_currency(number, strip_insignificant_zeros: number.to_i == number)
  end

  before do
    login_as company_administrator.user
  end

  it "allows listing applications for roles" do
    applications.each { _1.update!(equity_percent: 10) }
    visit spa_company_roles_path(company.external_id)

    find(:table_row, { "Role" => company_role.name }).click_on "2 candidates"

    expect(page).to have_selector "h1", text: company_role.name
    expect(page).to have_table(rows: applications.map do |application|
      {
        "Name" => application.name,
        "Application date" => application.created_at.strftime("%b %-d, %Y"),
        "Availability" => "#{application.hours_per_week}h / week",
      }
    end)

    application = applications.first
    find(:table_row, { "Name" => application.name }).click

    expect(page).to have_selector "h1", text: application.name
    expect(page).to have_text "1 of 2"
    expect(page).to have_text "Email #{application.email}", normalize_ws: true
    expect(page).to have_text "Application date #{application.created_at.strftime("%b %-d, %Y")}", normalize_ws: true
    expect(page).to have_text "Country #{application.display_country}", normalize_ws: true
    expect(page).to have_text("Availability #{application.hours_per_week} hours / week " \
                              "#{application.weeks_per_year} weeks / year", normalize_ws: true)
    expect(page).to have_text "Annual compensation ≈#{format_money(company_role.pay_rate_usd * application.hours_per_week * application.weeks_per_year)}", normalize_ws: true
    expect(page).to have_text "Equity split 10%", normalize_ws: true
    expect(page).to have_text application.description

    click_on "Next application"
    expect(page).to have_selector "h1", text: applications.second.name
    expect(page).to have_text applications.second.description
    expect(page).to have_text "2 of 2"

    find("body").native.send_keys("j")
    expect(page).to have_text "1 of 2"
    find("body").native.send_keys("k")
    expect(page).to have_text "2 of 2"

    click_on "Previous application"
    expect(page).to have_selector "h1", text: application.name
    expect(page).to have_text application.description
    expect(page).to have_text "1 of 2"
  end

  it "allows denying applications" do
    visit spa_company_role_applications_path(company.external_id, company_role.external_id)

    application = applications.first
    find(:table_row, { "Name" => application.name }).click

    click_on "Dismiss"
    expect(page).to have_selector "h1", text: applications.second.name
    expect(page).to have_text "1 of 1"
    expect(application.reload.denied?).to eq true

    find("body").native.send_keys("x")
    expect(page).to have_text "No candidates to review"
  end

  it "allows accepting applications" do
    visit spa_company_role_applications_path(company.external_id, company_role.external_id)

    application = applications.first
    find(:table_row, { "Name" => application.name }).click

    click_on "Invite"
    expect(page).to have_field "Email", with: application.email
    expect(page).to have_select "Country of residence", selected: ISO3166::Country[application.country_code].common_name
    expect(page).to have_select "Role", selected: application.company_role.name
    expect(page).to have_field "Average hours", with: application.hours_per_week
    click_on "Add your signature"
    click_on "Send invite"
    wait_for_ajax
    expect(company.company_workers.last.user.email).to eq application.email
    expect(application.reload.accepted?).to eq true
  end

  context "when company role is project-based" do
    let!(:company_role) { create(:project_based_company_role, company:, actively_hiring: true) }
    let!(:applications) { create_list(:company_role_application, 2, :project_based, company_role:) }

    it "allows listing applications for roles" do
      visit spa_company_roles_path(company.external_id)
      find(:table_row, { "Role" => company_role.name }).click_on "2 candidates"

      expect(page).to have_selector "h1", text: company_role.name
      expect(page).to have_table(rows: applications.map do |application|
        {
          "Name" => application.name,
          "Application date" => application.created_at.strftime("%b %-d, %Y"),
        }
      end)

      application = applications.first
      find(:table_row, { "Name" => application.name }).click

      expect(page).to have_selector "h1", text: application.name
      expect(page).to have_text "1 of 2"
      expect(page).to have_text "Email #{application.email}", normalize_ws: true
      expect(page).to have_text "Application date #{application.created_at.strftime("%b %-d, %Y")}", normalize_ws: true
      expect(page).to have_text "Country #{ISO3166::Country[application.country_code].common_name}", normalize_ws: true
      expect(page).to have_text "Rate $1,000", normalize_ws: true
      expect(page).to have_text application.description
      expect(page).to_not have_text("Availability")
      expect(page).to_not have_text("Annual compensation")
      expect(page).to_not have_text("Equity split")

      click_on "Next application"
      expect(page).to have_selector "h1", text: applications.second.name
      expect(page).to have_text applications.second.description
      expect(page).to have_text "2 of 2"

      find("body").native.send_keys("j")
      expect(page).to have_text "1 of 2"
      find("body").native.send_keys("k")
      expect(page).to have_text "2 of 2"

      click_on "Previous application"
      expect(page).to have_selector "h1", text: application.name
      expect(page).to have_text application.description
      expect(page).to have_text "1 of 2"
    end

    it "allows denying applications" do
      visit spa_company_role_applications_path(company.external_id, company_role.external_id)

      application = applications.first
      find(:table_row, { "Name" => application.name }).click

      click_on "Dismiss"
      expect(page).to have_selector "h1", text: applications.second.name
      expect(page).to have_text "1 of 1"
      expect(application.reload.denied?).to eq true

      find("body").native.send_keys("x")
      expect(page).to have_text "No candidates to review"
    end

    it "allows accepting applications" do
      visit spa_company_role_applications_path(company.external_id, company_role.external_id)

      application = applications.first
      find(:table_row, { "Name" => application.name }).click

      click_on "Invite"
      expect(page).to have_field "Email", with: application.email
      expect(page).to have_select "Country of residence", selected: ISO3166::Country[application.country_code].common_name
      expect(page).to have_select "Role", selected: application.company_role.name
      expect(page).to_not have_field "Average hours"
      click_on "Add your signature"
      click_on "Send invite"
      wait_for_ajax
      expect(company.company_workers.last.user.email).to eq application.email
      expect(application.reload.accepted?).to eq true
    end
  end

  context "when company role is salary-based" do
    let!(:company_role) { create(:salary_company_role, company:, actively_hiring: true) }
    let!(:applications) { create_list(:company_role_application, 2, :salary, company_role:) }

    it "allows listing applications for roles" do
      visit spa_company_roles_path(company.external_id)
      find(:table_row, { "Role" => company_role.name }).click_on "2 candidates"

      expect(page).to have_selector "h1", text: company_role.name
      expect(page).to have_table(rows: applications.map do |application|
        {
          "Name" => application.name,
          "Application date" => application.created_at.strftime("%b %-d, %Y"),
        }
      end)

      application = applications.first
      find(:table_row, { "Name" => application.name }).click

      expect(page).to have_selector "h1", text: application.name
      expect(page).to have_text "1 of 2"
      expect(page).to have_text "Email #{application.email}", normalize_ws: true
      expect(page).to have_text "Application date #{application.created_at.strftime("%b %-d, %Y")}", normalize_ws: true
      expect(page).to have_text "Country #{application.display_country}", normalize_ws: true
      expect(page).to have_text application.description
      expect(page).to have_text "Rate $100,000 / year", normalize_ws: true
      expect(page).to have_text "Equity split 20%", normalize_ws: true
      expect(page).to_not have_text "Availability"

      click_on "Next application"
      expect(page).to have_selector "h1", text: applications.second.name
      expect(page).to have_text applications.second.description
      expect(page).to have_text "2 of 2"

      find("body").native.send_keys("j")
      expect(page).to have_text "1 of 2"
      find("body").native.send_keys("k")
      expect(page).to have_text "2 of 2"

      click_on "Previous application"
      expect(page).to have_selector "h1", text: application.name
      expect(page).to have_text application.description
      expect(page).to have_text "1 of 2"
    end

    it "allows denying applications" do
      visit spa_company_role_applications_path(company.external_id, company_role.external_id)

      application = applications.first
      find(:table_row, { "Name" => application.name }).click

      click_on "Dismiss"
      expect(page).to have_selector "h1", text: applications.second.name
      expect(page).to have_text "1 of 1"
      expect(application.reload.denied?).to eq true

      find("body").native.send_keys("x")
      expect(page).to have_text "No candidates to review"
    end

    it "allows accepting applications" do
      visit spa_company_role_applications_path(company.external_id, company_role.external_id)

      application = applications.first
      find(:table_row, { "Name" => application.name }).click

      click_on "Invite"
      expect(page).to have_field "Email", with: application.email
      expect(page).to have_select "Role", selected: application.company_role.name
      expect(page).to have_field "Rate", with: "100000"
      expect(page).to have_text "/ year"
      expect(page).to_not have_field "Country of residence", with: application.display_country
      expect(page).to_not have_field "Average hours"
      expect(page).to_not have_button "Add your signature"
      click_on "Send invite"
      wait_for_ajax
      expect(company.company_workers.last.user.email).to eq application.email
      expect(application.reload.accepted?).to eq true
    end
  end
end
