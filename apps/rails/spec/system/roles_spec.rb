# frozen_string_literal: true

RSpec.describe "Roles" do
  let!(:company) { create(:company, show_stats_in_job_descriptions: true) }
  let!(:company_role) { create(:company_role, company:, actively_hiring: true) }

  def fill_in_application(hourly: false)
    fill_in "Name", with: "Mister Personman"
    fill_in "Email", with: "mister@personman.fr"
    select "France", from: "Country (where you'll usually work from)"
    fill_in_rich_text_editor "Briefly describe your career and provide links to key projects as proof of work", with: "I'm French, *isn't that good enough for you?*"

    if hourly
      fill_in "Hours per week", with: 30
      fill_in "Weeks per year", with: 40
    end
  end

  describe "public list" do
    it "displays a list of roles that are actively hiring" do
      company.roles_social_card.attach fixture_file_upload("image.png")
      inactive_role = create(:company_role, company:)
      visit spa_roles_path(company.display_name.parameterize, company.external_id)

      title = "Open roles at #{company.display_name}"
      expect(page).to have_title(title)
      expect(page).to have_selector("meta[name='twitter:card'][content='summary_large_image']", visible: false)
      expect(page).to have_selector("meta[name='twitter:title'][content='#{title}']", visible: false)
      expect(page).to have_selector("meta[name='twitter:image'][content='#{company.roles_social_card.url}']", visible: false)
      expect(page).to have_selector("meta[name='og:image'][content='#{company.roles_social_card.url}']", visible: false)

      expect(page).to have_selector("h1", text: company.display_name)
      expect(page).to have_text("Work from anywhere · Choose your hours")
      expect(page).to_not have_text("Earn equity")
      expect(page).to_not have_link inactive_role.name
      click_link company_role.name

      expect(page).to have_selector("h1", text: "#{company_role.name} at #{company.display_name}")
    end

    it "displays a placeholder if the company has no active roles" do
      company_role.update!(actively_hiring: false)
      visit "/roles/company-#{company.external_id}"

      expect(page).to_not have_selector("meta[name='twitter:card']", visible: false)
      expect(page).to have_selector("h1", text: company.display_name)
      expect(page).to have_text "No open roles right now. Check back later!"
    end

    it "updates the URL with the correct slug" do
      company.update!(public_name: "Weird / cömpany")
      visit spa_roles_path(company.display_name.parameterize, company.external_id)
      wait_for_ajax

      expect(page).to have_selector("h1", text: "Weird / cömpany")
      expect(page.current_path).to eq "/roles/weird-company-#{company.external_id}"
    end

    context "if the equity compensation is enabled for the company" do
      before do
        company.update!(equity_compensation_enabled: true)
      end

      it "shows earning equity as a perk" do
        visit spa_roles_path(company.display_name.parameterize, company.external_id)

        expect(page).to have_text("Work from anywhere · Choose your hours · Earn equity")
      end
    end
  end

  it "shows the company role and allows one to apply", :vcr do
    allow_any_instance_of(CompanyRolePresenter).to receive(:company_stats).and_return({
      freelancers: 10,
      avg_weeks_per_year: 37.523,
      avg_hours_per_week: 20.435,
      avg_tenure: 2,
      attrition_rate: 3,
    })
    company.update!(equity_compensation_enabled: true)
    company_role.rate.update!(pay_rate_usd: 105, trial_pay_rate_usd: 50)
    company_role.update!(trial_enabled: true)
    visit spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)

    expect(page).to have_selector("h1", text: "#{company_role.name} at #{company.display_name}")
    expect(page).to have_link(company.website, href: company.website)
    expect(page).to have_text company_role.job_description
    expect(page).to have_text company.description
    expect(page).to have_content "10 part-time freelancers"
    expect(page).to have_content "Average 20 hours / week, 38 weeks / year"
    expect(page).to have_content "Average tenure of 2 years"
    expect(page).to have_content "3% annual contractor \"churn\" rate"
    expect(page).to have_text "$105 / hour"
    expect(page).to have_text "This role has a trial period with a rate of $50 / hour."
    expect(page).to_not have_text "Other available roles"
    click_on "Apply now"

    click_on "Submit application"
    expect(page).to have_field("Name", valid: false)
    expect(page).to have_field("Email", valid: false)
    expect(page).to have_field("Country (where you'll usually work from)", valid: false)
    expect(find_rich_text_editor("Briefly describe your career and provide links to key projects as proof of work")[:"aria-invalid"]).to eq "true"

    # Pulled from company average stats
    expect(page).to have_field "Hours per week", with: 20
    expect(page).to have_field "Weeks per year", with: 38
    fill_in_application(hourly: true) # sets to 30 hours per week, 40 weeks per year
    expect(page).to_not have_text "You'll need a bank account outside"
    fill_in "Equity percentage value", with: 25
    expect(page).to have_text("Cash $94,500 / year", normalize_ws: true) # $105 * 30 * 40 * 75%
    expect(page).to have_text("Stock options 315 / year", normalize_ws: true)
    expect(page).to have_text("Cash bonus to exercise options $12,600 / year", normalize_ws: true)
    expect(page).to have_text("Total cash $107,100 / year", normalize_ws: true)

    click_on "Submit application"

    expect(page).to have_text "We received your application"
    application = CompanyRoleApplication.last
    expect(application.name).to eq "Mister Personman"
    expect(application.email).to eq "mister@personman.fr"
    expect(application.country_code).to eq "FR"
    expect(application.description).to eq "<p>I'm French, <em>isn't that good enough for you?</em></p>"
    expect(application.hours_per_week).to eq 30
    expect(application.weeks_per_year).to eq 40
    expect(application.equity_percent).to eq 25

    company_role.update!(trial_enabled: false)
    visit "/roles/company/role-#{company_role.external_id}"
    wait_for_ajax
    expect(page).to_not have_text "This role starts with a trial period at a rate of $50 per hour."
  end

  it "allows one to apply to a project-based role", :vcr do
    allow_any_instance_of(CompanyRolePresenter).to receive(:company_stats).and_return({
      freelancers: 10,
      avg_weeks_per_year: 37.523,
      avg_hours_per_week: 20.435,
      avg_tenure: 2,
      attrition_rate: 3,
    })
    company.update!(equity_compensation_enabled: true)
    project_based_role = create(:project_based_company_role, company:, name: "Project-based Engineer", actively_hiring: true, pay_rate_usd: 1_000)
    visit spa_role_path(company.display_name.parameterize, project_based_role.name.parameterize, project_based_role.external_id)

    expect(page).to have_selector("h1", text: "#{project_based_role.name} at #{company.display_name}")
    expect(page).to have_link(company.website, href: company.website)
    expect(page).to have_text project_based_role.job_description
    expect(page).to have_text company.description
    expect(page).to have_content "10 part-time freelancers"
    expect(page).to have_content "Average 20 hours / week, 38 weeks / year"
    expect(page).to have_content "Average tenure of 2 years"
    expect(page).to have_content "3% annual contractor \"churn\" rate"
    expect(page).to have_text("$1,000 Rate per project", normalize_ws: true)
    expect(page).to have_text "Other available roles"
    click_on "Apply now"

    click_on "Submit application"
    expect(page).to have_field("Name", valid: false)
    expect(page).to have_field("Email", valid: false)
    expect(page).to have_field("Country (where you'll usually work from)", valid: false)
    expect(find_rich_text_editor("Briefly describe your career and provide links to key projects as proof of work")[:"aria-invalid"]).to eq "true"

    expect(page).to_not have_field "Hours per week"
    expect(page).to_not have_field "Weeks per year"
    fill_in_application
    expect(page).to_not have_text "You'll need a bank account outside"
    expect(page).to_not have_field "Equity percentage value"
    expect(page).to_not have_text("Cash bonus to exercise options")
    expect(page).to_not have_text("Stock options")
    expect(page).to_not have_text("Total cash")

    click_on "Submit application"

    expect(page).to have_text "We received your application"
    application = CompanyRoleApplication.last
    expect(application.name).to eq "Mister Personman"
    expect(application.email).to eq "mister@personman.fr"
    expect(application.country_code).to eq "FR"
    expect(application.description).to eq "<p>I'm French, <em>isn't that good enough for you?</em></p>"
    expect(application.hours_per_week).to eq nil
    expect(application.weeks_per_year).to eq nil
    expect(application.equity_percent).to eq 0
  end

  it "allows one to apply to a salary role", :vcr do
    allow_any_instance_of(CompanyRolePresenter).to receive(:company_stats).and_return({
      freelancers: 10,
      avg_weeks_per_year: 37.523,
      avg_hours_per_week: 20.435,
      avg_tenure: 2,
      attrition_rate: 3,
    })
    company.update!(equity_compensation_enabled: true)
    salary_role = create(:salary_company_role, company:, name: "Salaried Engineer", actively_hiring: true, pay_rate_usd: 100_000)
    visit spa_role_path(company.display_name.parameterize, salary_role.name.parameterize, salary_role.external_id)

    expect(page).to have_selector("h1", text: "#{salary_role.name} at #{company.display_name}")
    expect(page).to have_link(company.website, href: company.website)
    expect(page).to have_text salary_role.job_description
    expect(page).to have_text company.description
    expect(page).to have_content "10 part-time freelancers"
    expect(page).to have_content "Average 20 hours / week, 38 weeks / year"
    expect(page).to have_content "Average tenure of 2 years"
    expect(page).to have_content "3% annual contractor \"churn\" rate"
    expect(page).to have_content "$100,000 / year"
    expect(page).to have_text "Other available roles"
    click_on "Apply now"

    click_on "Submit application"
    expect(page).to have_field("Name", valid: false)
    expect(page).to have_field("Email", valid: false)
    expect(page).to have_field("Country (where you'll usually work from)", valid: false)
    expect(find_rich_text_editor("Briefly describe your career and provide links to key projects as proof of work")[:"aria-invalid"]).to eq "true"

    expect(page).to_not have_field "Hours per week"
    expect(page).to_not have_field "Weeks per year"
    fill_in_application
    fill_in "How much of your salary would you like to swap for equity?", with: 25
    expect(page).to have_field "Equity percentage value"
    expect(page).to have_text("Stock options 250 / year", normalize_ws: true)
    expect(page).to have_text("Cash $75,000 / year", normalize_ws: true)
    expect(page).to have_text("Cash bonus to exercise options $10,000 / year", normalize_ws: true)
    expect(page).to have_text("Total cash $85,000 / year", normalize_ws: true)

    click_on "Submit application"

    expect(page).to have_text "We received your application"
    application = CompanyRoleApplication.last
    expect(application.name).to eq "Mister Personman"
    expect(application.email).to eq "mister@personman.fr"
    expect(application.country_code).to eq "FR"
    expect(application.description).to eq "<p>I'm French, <em>isn't that good enough for you?</em></p>"
    expect(application.hours_per_week).to eq nil
    expect(application.weeks_per_year).to eq nil
    expect(application.equity_percent).to eq 25
  end

  it "hides the current team numbers if show_stats_in_job_descriptions is unset" do
    company.update!(show_stats_in_job_descriptions: false)

    visit spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)
    expect(page).to have_selector("h1", text: "#{company_role.name} at #{company.display_name}")

    expect(page).to_not have_content "Our team"
    expect(page).to_not have_content "freelancers"
    expect(page).to_not have_content "tenure"
    expect(page).to_not have_content "churn"
  end

  it "shows links to other available roles" do
    company.update!(name: "Company")
    create(:company_role, company:)
    other_role = create(:company_role, company:, name: "Other role", actively_hiring: true)
    project_based_role = create(:company_role, company:, name: "Project-based Engineer", actively_hiring: true)
    salary_role = create(:salary_company_role, company:, name: "Salaried Engineer", actively_hiring: true)
    visit spa_role_path(company.display_name.parameterize, project_based_role.name.parameterize, project_based_role.external_id)

    click_link other_role.name

    expect(page).to have_selector("h1", text: "#{other_role.name} at #{company.display_name}")
    expect(page).to have_text other_role.job_description
    expect(page.current_path).to eq spa_role_path(company.display_name.parameterize, other_role.name.parameterize, other_role.external_id)
    expect(page).to have_link company_role.name
    expect(page).to have_link project_based_role.name
    expect(page).to have_link salary_role.name

    click_link project_based_role.name
    expect(page).to have_selector("h1", text: "#{project_based_role.name} at #{company.display_name}")
    expect(page).to have_text project_based_role.job_description
    expect(page.current_path).to eq spa_role_path(company.display_name.parameterize, project_based_role.name.parameterize, project_based_role.external_id)
    expect(page).to have_link company_role.name
    expect(page).to have_link other_role.name
    expect(page).to have_link salary_role.name

    click_link salary_role.name
    expect(page).to have_selector("h1", text: "#{salary_role.name} at #{company.display_name}")
    expect(page).to have_text salary_role.job_description
    expect(page.current_path).to eq spa_role_path(company.display_name.parameterize, salary_role.name.parameterize, salary_role.external_id)
    expect(page).to have_link company_role.name
    expect(page).to have_link other_role.name
    expect(page).to have_link project_based_role.name
  end

  it "updates the URL to use the correct company and role slugs" do
    company.update!(public_name: "Weird / cömpany")
    company_role.update!(name: "very-weird | role")
    visit spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)
    expect(page).to have_text("#{company_role.name} at #{company.display_name}")
    expect(page).to_not have_selector("meta[name='twitter:card']", visible: false)

    company_role.social_card.attach fixture_file_upload("image.png")
    visit spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)
    wait_for_ajax

    title = "#{company_role.name} at #{company.display_name}"
    expect(page.current_path).to eq spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)
    expect(page).to have_text("#{company_role.name} at #{company.display_name}")
    expect(page).to have_title(title)
    expect(page).to have_selector("meta[name='twitter:card'][content='summary_large_image']", visible: false)
    expect(page).to have_selector("meta[name='twitter:title'][content='#{title}']", visible: false)
    expect(page).to have_selector("meta[name='twitter:image'][content='#{company_role.social_card.url}']", visible: false)
    expect(page).to have_selector("meta[name='og:image'][content='#{company_role.social_card.url}']", visible: false)
  end

  context "when the equity compensation is disabled for the company", :vcr do
    it "hides the equity selector" do
      visit spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)
      click_on "Apply now"
      fill_in_application
      expect(page).to_not have_field "Equity percentage value"
      click_on "Submit application"

      expect(page).to have_text "We received your application"
      application = CompanyRoleApplication.last
      expect(application.name).to eq "Mister Personman"
      expect(application.equity_percent).to eq 0
    end
  end

  context "when the company is Gumroad", :vcr do
    before do
      company.update!(is_gumroad: true)
    end

    it "allows applying from Brazil" do
      visit spa_role_path(company.display_name.parameterize, company_role.name.parameterize, company_role.external_id)
      click_on "Apply now"

      fill_in_application
      select "Brazil", from: "Country (where you'll usually work from)"
      expect(page).to have_text "You'll need a bank account outside of Brazil"
      click_on "Submit application"

      expect(page).to have_text "We received your application"
      application = CompanyRoleApplication.last
      expect(application.country_code).to eq "BR"
    end
  end
end
