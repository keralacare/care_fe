import { useTranslation } from "react-i18next";

import Chip from "@/CAREUI/display/Chip";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { Avatar } from "@/components/Common/Avatar";
import Page from "@/components/Common/Page";
import SearchByMultipleFields from "@/components/Common/SearchByMultipleFields";
import { FacilityModel } from "@/components/Facility/models";

import useFilters from "@/hooks/useFilters";

import routes from "@/Utils/request/api";
import useTanStackQueryInstead from "@/Utils/request/useQuery";

interface FacilitySelectionCardProps {
  facility: FacilityModel;
  onSelect: (facility: FacilityModel) => void;
}

const FacilitySelectionCard = ({
  facility,
  onSelect,
}: FacilitySelectionCardProps) => {
  return (
    <Card
      onClick={() => facility.id && onSelect(facility)}
      className="cursor-pointer transition-all hover:border-primary-500 hover:shadow-lg"
    >
      <div className="flex items-center gap-4 p-4">
        <Avatar
          name={facility.name || ""}
          imageUrl={facility.read_cover_image_url}
          className="h-16 w-16"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{facility.name}</h3>
          <div className="mt-2">
            <Chip
              text={facility.facility_type || ""}
              variant="custom"
              className="bg-blue-100 text-blue-900"
              hideBorder
              size="small"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

const FacilitySelectionSkeleton = () => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    </Card>
  );
};

interface FacilitySelectionPageProps {
  onSelect: (facility: FacilityModel) => void;
}

export function FacilitySelectionPage({
  onSelect,
}: FacilitySelectionPageProps) {
  const { t } = useTranslation();
  const { qParams, updateQuery, Pagination, resultsPerPage, clearSearch } =
    useFilters({
      limit: 14,
      cacheBlacklist: ["search"],
    });

  const { data: permittedData, loading: isLoading } = useTanStackQueryInstead(
    routes.getPermittedFacilities,
    {
      query: {
        limit: resultsPerPage,
        page: qParams.page || 1,
        offset: (qParams.page ? qParams.page - 1 : 0) * resultsPerPage,
        search_text: qParams.search || undefined,
      },
    },
  );

  let content: JSX.Element | JSX.Element[];

  if (isLoading) {
    content = (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <FacilitySelectionSkeleton key={i} />
        ))}
      </div>
    );
  } else if (permittedData?.results.length) {
    content = (
      <>
        <div className="grid gap-4 md:grid-cols-2">
          {permittedData.results.map((facility: FacilityModel) => (
            <FacilitySelectionCard
              key={facility.id!}
              facility={facility}
              onSelect={() => onSelect(facility)}
            />
          ))}
        </div>
        <div className="mt-4">
          <Pagination totalCount={permittedData.count} />
        </div>
      </>
    );
  } else {
    content = (
      <Card className="p-8">
        <div className="text-center text-2xl font-semibold text-muted-foreground">
          {t("no_facilities")}
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto h-screen w-full max-w-3xl overflow-auto bg-gray-100 p-4">
      <Page title="Please select your facility." breadcrumbs={false} hideBack>
        <div className="mt-4">
          <SearchByMultipleFields
            id="facility-search"
            options={[
              {
                key: "facility_district_name",
                label: "Facility Name",
                type: "text" as const,
                placeholder: "Search facilities...",
                value: qParams.search || "",
                shortcutKey: "f",
              },
            ]}
            className="w-full"
            onSearch={(key, value) => updateQuery({ search: value })}
            clearSearch={clearSearch}
          />
        </div>
        <div className="mt-4">{content}</div>
      </Page>
    </div>
  );
}
