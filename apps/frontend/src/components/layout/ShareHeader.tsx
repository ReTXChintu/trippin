import { Flex } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function ShareHeader() {
  return (
    <Flex as="header" align="center" justify="center" h="60px" bg="sf" borderBottomWidth="1px" borderColor="ln">
      <Link to="/">
        <BrandLogo size={30} />
      </Link>
    </Flex>
  );
}
