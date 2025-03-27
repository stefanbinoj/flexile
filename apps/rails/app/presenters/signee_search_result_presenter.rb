# frozen_string_literal: true

class SigneeSearchResultPresenter
  def initialize(results)
    @results = results
  end

  def props
    results.map do |member|
      user = member.user
      {
        id: member.id,
        type: member.class.name,
        name: user.legal_name,
        email: user.email,
        role: type_of(member),
      }
    end
  end

  private
    attr_reader :results

    def type_of(member)
      case member
      when CompanyWorker
        "Contractor"
      when CompanyInvestor
        "Investor"
      when CompanyAdministrator
        "Administrator"
      end
    end
end
